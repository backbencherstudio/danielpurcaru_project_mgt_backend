import { Controller, Post, Body, Get, Param, Patch, Delete } from '@nestjs/common';
import { EmployeeLoanService } from './employee-loan.service';
import { CreateEmployeeLoanDto } from './dto/create-employee-loan.dto';
import { UpdateEmployeeLoanDto } from './dto/update-employee-loan.dto';

@Controller('employee-loan')
export class EmployeeLoanController {
  constructor(private readonly employeeLoanService: EmployeeLoanService) { }

  // Employee: Create loan request
  @Post()
  create(@Body() dto: CreateEmployeeLoanDto) {
    return this.employeeLoanService.createLoanRequest(dto);
  }

  @Get()
  findAllLoans() {
    return this.employeeLoanService.findAllLoans();
  }

  // Employee: Get all their loans
  @Get('user/:user_id')
  findEmployeeLoans(@Param('user_id') user_id: string) {
    return this.employeeLoanService.findEmployeeLoans(user_id);
  }

  // Admin: Update loan
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeLoanDto) {
    return this.employeeLoanService.updateLoan(id, dto);
  }

  // Admin: Delete loan
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeeLoanService.deleteLoan(id);
  }
}
