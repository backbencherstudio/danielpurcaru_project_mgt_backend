import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { FileUrlHelper } from 'src/common/helper/file-url.helper';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateProjectDto) {
    try {
      const { assignees, userId, ...rest } = dto;

      const project = await this.prisma.project.create({
        data: {
          name: dto.name,
          address: dto.address,
          start_date: dto.start_date ? new Date(dto.start_date) : undefined,
          end_date: dto.end_date ? new Date(dto.end_date) : undefined,
          budget: dto.budget,
          cost: dto.cost,
          priority: dto.priority,
          ...(userId && { userId }),
          assignees: assignees && assignees.length > 0
            ? {
              create: assignees.map(userId => ({
                user: { connect: { id: userId } }
              }))
            }
            : undefined,
        },
        include: { assignees: true },
      });

      return { success: true, data: project };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async findAll(query: ProjectQueryDto) {
    try {
      const {
        search,
        priority,
        status,
        page = '1',
        limit = '10',
      } = query;

      const pageNumber = parseInt(page, 10) || 1;
      const pageSize = parseInt(limit, 10) || 10;
      const skip = (pageNumber - 1) * pageSize;

      const where: any = {};

      if (priority) where.priority = priority;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ];
      }

      const total = await this.prisma.project.count({ where });

      const data = await this.prisma.project.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          end_date: true,
          priority: true,
          cost: true,
          status: true,
          assignees: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      // Add avatarUrl to each assignee's user
      const dataWithAvatarUrl = data.map(project => ({
        ...project,
        assignees: project.assignees.map(a => ({
          ...a,
          user: FileUrlHelper.addAvatarUrl(a.user),
        })),
      }));

      return {
        success: true,
        meta: {
          total,
          page: pageNumber,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
        data: dataWithAvatarUrl,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async findOne(id: string) {
    try {
      // Get project with assignees and user info
      const project = await this.prisma.project.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          status: true,
          assignees: {
            select: {
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  name: true,
                  email: true,
                  avatar: true,
                  employee_role: true,
                  hourly_rate: true,
                },
              },
            },
          },
        },
      });
      if (!project) return { success: false, message: 'Project not found' };
      // For each assignee, calculate total hours and cost
      const assigneeData = await Promise.all(
        project.assignees.map(async (a) => {
          const agg = await this.prisma.attendance.aggregate({
            where: { user_id: a.user.id, deleted_at: null },
            _sum: { hours: true },
          });
          const hours = Number(agg._sum.hours) || 0;
          const cost = hours * Number(a.user.hourly_rate || 0);
          const userWithAvatarUrl = FileUrlHelper.addAvatarUrl(a.user);
          return {
            id: a.user.id,
            name: a.user.name,
            avatarUrl: userWithAvatarUrl.avatarUrl,
            role: a.user.employee_role,
            hours,
            cost,
          };
        })
      );
      // Calculate project totals
      const totalHours = assigneeData.reduce((sum, a) => sum + a.hours, 0);
      const totalCost = assigneeData.reduce((sum, a) => sum + a.cost, 0);
      return {
        success: true,
        data: {
          id: project.id,
          name: project.name,
          status: project.status,
          totalHours,
          totalCost,
          assignees: assigneeData,
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }


  async update(id: string, dto: UpdateProjectDto) {
    try {
      const { assignees, userId, ...rest } = dto;

      const data: any = {
        ...rest,
        start_date: dto.start_date ? new Date(dto.start_date) : undefined,
        end_date: dto.end_date ? new Date(dto.end_date) : undefined,
        ...(userId && { userId }),
      };

      if (assignees) {
        data.assignees = {
          deleteMany: {}, // remove all previous
          create: assignees.map(userId => ({
            user: { connect: { id: userId } }
          })),
        };
      }

      const project = await this.prisma.project.update({
        where: { id },
        data,
        include: { assignees: true },
      });
      return { success: true, data: project };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async remove(id: string) {
    try {
      const data = await this.prisma.project.delete({
        where: { id },
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
