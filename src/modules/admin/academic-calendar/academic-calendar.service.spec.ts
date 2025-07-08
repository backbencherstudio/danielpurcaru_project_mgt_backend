import { Test, TestingModule } from '@nestjs/testing';
import { AcademicCalendarService } from './academic-calendar.service';

describe('AcademicCalendarService', () => {
  let service: AcademicCalendarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AcademicCalendarService],
    }).compile();

    service = module.get<AcademicCalendarService>(AcademicCalendarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
