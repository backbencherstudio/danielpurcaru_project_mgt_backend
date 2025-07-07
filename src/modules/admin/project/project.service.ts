import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';

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

      return {
        success: true,
        meta: {
          total,
          page: pageNumber,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
        data,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async findOne(id: string) {
    try {
      const data = await this.prisma.project.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          end_date: true,
          priority: true,
          cost: true,
          status: true,
          assignees: {
            include: {
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
                  recorded_hours: true,
                  earning: true,
                }
              }
            },
          },
        },
      });
      return { success: true, data };
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
