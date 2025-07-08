import { Module } from '@nestjs/common';
import { FaqModule } from './faq/faq.module';
import { ContactModule } from './contact/contact.module';
import { WebsiteInfoModule } from './website-info/website-info.module';
import { PaymentTransactionModule } from './payment-transaction/payment-transaction.module';
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import { EmployeeModule } from './employee/employee.module';
import { ProjectModule } from './project/project.module';
import { EmployeeHolidayModule } from './employee-holiday/employee-holiday.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AcademicCalendarModule } from './academic-calendar/academic-calendar.module';
import { EmployeeLoanModule } from './employee-loan/employee-loan.module';

@Module({
  imports: [
    FaqModule,
    ContactModule,
    WebsiteInfoModule,
    PaymentTransactionModule,
    UserModule,
    NotificationModule,
    EmployeeModule,
    ProjectModule,
    EmployeeHolidayModule,
    AttendanceModule,
    AcademicCalendarModule,
    EmployeeLoanModule,
  ],
})
export class AdminModule {}
