import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AcademicCalendarService } from './academic-calendar.service';
import { CreateAcademicCalendarDto } from './dto/create-academic-calendar.dto';
import { UpdateAcademicCalendarDto } from './dto/update-academic-calendar.dto';

@Controller('academic-calendar')
export class AcademicCalendarController {
  constructor(private readonly academicCalendarService: AcademicCalendarService) { }

  @Post()
  create(@Body() createAcademicCalendarDto: CreateAcademicCalendarDto) {
    return this.academicCalendarService.create(createAcademicCalendarDto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.academicCalendarService.findAll(query);
  }

  @Get('calendar')
  findCalendarMonth(@Query('month') month: string, @Query('year') year: string) {
    return this.academicCalendarService.findCalendarMonth({ month, year });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.academicCalendarService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAcademicCalendarDto: UpdateAcademicCalendarDto) {
    return this.academicCalendarService.update(id, updateAcademicCalendarDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.academicCalendarService.remove(id);
  }
}
