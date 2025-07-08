import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeLoanService } from './employee-loan.service';

describe('EmployeeLoanService', () => {
  let service: EmployeeLoanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmployeeLoanService],
    }).compile();

    service = module.get<EmployeeLoanService>(EmployeeLoanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
