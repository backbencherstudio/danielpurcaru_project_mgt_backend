import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from 'src/modules/auth/auth.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import * as bcrypt from 'bcrypt';
import appConfig from 'src/config/app.config';
import { StringHelper } from 'src/common/helper/string.helper';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import { FileUrlHelper } from 'src/common/helper/file-url.helper';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) { }

  async create(
    createEmployeeDto: CreateEmployeeDto,
    file?: Express.Multer.File,
  ) {
    try {
      // Check if email already exists
      const existing = await this.prisma.user.findUnique({
        where: { email: createEmployeeDto.email },
      });
      if (existing) {
        return { success: false, message: 'Email already exists' };
      }

      // Generate username from email (part before @)
      const username = createEmployeeDto.email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '');

      // Add to createEmployeeDto
      createEmployeeDto.username = username;

      // Use password if provided, otherwise use physical_number as password
      const passwordToUse = createEmployeeDto.password || createEmployeeDto.physical_number;

      // Hash password
      const hashedPassword = await bcrypt.hash(
        passwordToUse,
        appConfig().security.salt,
      );
      // Handle file upload
      if (file) {
        const fileName = StringHelper.generateRandomFileName(file.originalname);
        await SojebStorage.put(
          appConfig().storageUrl.avatar + fileName,
          file.buffer,
        );
        createEmployeeDto.avatar = fileName;
      }

      // Create user
      const fullName =
        createEmployeeDto.first_name + ' ' + createEmployeeDto.last_name;
      const result = await this.prisma.user.create({
        data: {
          name: fullName,
          first_name: createEmployeeDto.first_name,
          last_name: createEmployeeDto.last_name,
          email: createEmployeeDto.email,
          password: hashedPassword,
          type: 'employee',
          phone_number: createEmployeeDto.phone_number,
          physical_number: createEmployeeDto.physical_number,
          employee_role: createEmployeeDto.employee_role,
          hourly_rate: createEmployeeDto.hourly_rate,
          address: createEmployeeDto.address,
          avatar: createEmployeeDto.avatar,
          username: createEmployeeDto.username,
        },
      });

      // Send employee credentials via email
      await this.mailService.sendEmployeeCredentials({
        email: result.email,
        name: result.name,
        username: result.username,
        password: passwordToUse, // Send the password that was actually used
      });

      // Auto-assign employee to all active projects (status = 1)
      await this.assignEmployeeToActiveProjects(result.id);

      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async findAll(query: EmployeeQueryDto) {
    try {
      const { employee_role, search, page = '1', limit = '10' } = query;

      const pageNumber = parseInt(page, 10) || 1;
      const pageSize = parseInt(limit, 10) || 10;
      const skip = (pageNumber - 1) * pageSize;

      // Build dynamic where clause
      const where: any = {
        type: 'employee',
        deleted_at: null,
      };

      if (employee_role) {
        where.employee_role = employee_role;
      }

      if (search) {
        where.OR = [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Get total count for pagination
      const total = await this.prisma.user.count({ where });

      // Get paginated data
      const data = await this.prisma.user.findMany({
        where,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          username: true,
          name: true,
          email: true,
          avatar: true,
          employee_role: true,
          hourly_rate: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: pageSize,
      });

      // For each employee, calculate recorded_hours and earning
      const dataWithHours = await Promise.all(
        data.map(async (emp) => {
          const agg = await this.prisma.attendance.aggregate({
            where: { user_id: emp.id, deleted_at: null },
            _sum: { hours: true },
          });
          const recorded_hours = Number(agg._sum.hours) || 0;
          const earning = recorded_hours * Number(emp.hourly_rate || 0);

          // Update the user with new recorded_hours and earning
          await this.prisma.user.update({
            where: { id: emp.id },
            data: { recorded_hours, earning },
          });

          return FileUrlHelper.addAvatarUrl({
            ...emp,
            recorded_hours,
            earning,
          });
        }),
      );

      return {
        success: true,
        meta: {
          total,
          page: pageNumber,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
        data: dataWithHours,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async findOne(id: string) {
    try {
      const emp = await this.prisma.user.findUnique({
        where: { id, type: 'employee', deleted_at: null },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
          employee_role: true,
          hourly_rate: true,
          projectAssignee: {
            select: {
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
              total_hours: true,
              total_cost: true,
            },
            take: 10,
          },
          attendance: {
            select: {
              id: true,
              hours: true,
              date: true,
              attendance_status: true,
              start_time: true,
              lunch_start: true,
              lunch_end: true,
              end_time: true,
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { date: 'desc' },
            take: 30,
          },
        },
      });
      if (!emp) return { success: false, message: 'Employee not found' };

      // Get unique project IDs from attendance records
      const attendedProjectIds = [...new Set(emp.attendance.map(att => att.project?.id).filter(Boolean))];

      // Filter projectAssignee to only include projects with attendance
      const filteredProjectAssignee = emp.projectAssignee.filter(assignee =>
        attendedProjectIds.includes(assignee.project.id)
      );

      const agg = await this.prisma.attendance.aggregate({
        where: { user_id: emp.id, deleted_at: null },
        _sum: { hours: true },
      });
      const recorded_hours = Number(agg._sum.hours) || 0;
      const earning = recorded_hours * Number(emp.hourly_rate || 0);
      const dataWithUrl = FileUrlHelper.addAvatarUrl({
        ...emp,
        projectAssignee: filteredProjectAssignee,
        recorded_hours,
        earning,
      });
      return { success: true, data: dataWithUrl };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
    file?: Express.Multer.File,
  ) {
    try {
      if (updateEmployeeDto.password) {
        updateEmployeeDto.password = await bcrypt.hash(
          updateEmployeeDto.password,
          appConfig().security.salt,
        );
      }
      if (file) {
        const fileName = StringHelper.generateRandomFileName(file.originalname);
        await SojebStorage.put(
          appConfig().storageUrl.avatar + fileName,
          file.buffer,
        );
        updateEmployeeDto.avatar = fileName;
      }
      const result = await this.prisma.user.update({
        where: { id },
        data: updateEmployeeDto,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          name: true,
          email: true,
          avatar: true,
          employee_role: true,
          hourly_rate: true,
          recorded_hours: true,
          earning: true,
        },
      });
      const dataWithUrl = FileUrlHelper.addAvatarUrl(result);
      return { success: true, data: dataWithUrl };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async remove(id: string) {
    try {
      // 1. Get the user to find the avatar file name
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: { avatar: true },
      });

      // 2. Delete the avatar file if it exists
      if (user?.avatar) {
        await SojebStorage.delete(appConfig().storageUrl.avatar + user.avatar);
      }

      // 3. Soft delete the user
      const result = await this.prisma.user.delete({
        where: { id },
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Auto-assign employee to all active projects (status = 1)
   * @param employeeId - The ID of the employee to assign
   */
  private async assignEmployeeToActiveProjects(employeeId: string): Promise<void> {
    try {
      // Find all active projects (status = 1)
      const activeProjects = await this.prisma.project.findMany({
        where: {
          status: 1,
          deleted_at: null, // Ensure project is not soft deleted
        },
        select: {
          id: true,
        },
      });

      // Create project assignments for each active project
      const assignments = activeProjects.map(project => ({
        projectId: project.id,
        userId: employeeId,
        total_hours: 0,
        total_cost: 0,
      }));

      // Bulk create project assignments
      if (assignments.length > 0) {
        await this.prisma.projectAssignee.createMany({
          data: assignments,
          skipDuplicates: true, // Skip if assignment already exists
        });
      }
    } catch (error) {
      // Log error but don't throw to avoid breaking employee creation
      console.error('Error assigning employee to active projects:', error);
    }
  }
}
