import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeHolidayService } from './employee-holiday.service';

describe('EmployeeHolidayService', () => {
  let service: EmployeeHolidayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmployeeHolidayService],
    }).compile();

    service = module.get<EmployeeHolidayService>(EmployeeHolidayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
