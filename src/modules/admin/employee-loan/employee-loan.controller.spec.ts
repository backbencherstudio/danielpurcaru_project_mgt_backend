import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeLoanController } from './employee-loan.controller';
import { EmployeeLoanService } from './employee-loan.service';

describe('EmployeeLoanController', () => {
  let controller: EmployeeLoanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeLoanController],
      providers: [EmployeeLoanService],
    }).compile();

    controller = module.get<EmployeeLoanController>(EmployeeLoanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
