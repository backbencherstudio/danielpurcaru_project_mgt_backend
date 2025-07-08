import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) { }

  @Post()
  create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendanceService.create(createAttendanceDto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.attendanceService.findAll(query);
  }

  @Get('grid')
  async findGrid(@Query('month') month: string, @Query('year') year: string, @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.attendanceService.findGrid({ month, year, search, page, limit });
  }

  @Get('employee/:user_id')
  getEmployeeAttendance(@Param('user_id') user_id: string, @Query('month') month: string, @Query('year') year: string) {
    return this.attendanceService.getEmployeeAttendance({ user_id, month, year });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAttendanceDto: UpdateAttendanceDto) {
    return this.attendanceService.update(id, updateAttendanceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }
}
