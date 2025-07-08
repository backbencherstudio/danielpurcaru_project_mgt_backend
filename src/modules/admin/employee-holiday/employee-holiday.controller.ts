import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { EmployeeHolidayService } from './employee-holiday.service';
import { CreateEmployeeHolidayDto } from './dto/create-employee-holiday.dto';
import { UpdateEmployeeHolidayDto } from './dto/update-employee-holiday.dto';
import { EmployeeHolidayQueryDto } from './dto/employee-holiday-query.dto';

@Controller('employee-holiday')
export class EmployeeHolidayController {
  constructor(private readonly service: EmployeeHolidayService) { }

  @Post()
  create(@Body() dto: CreateEmployeeHolidayDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: EmployeeHolidayQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeHolidayDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
