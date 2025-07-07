import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class EmployeeQueryDto {
    @IsOptional()
    @IsString()
    employee_role?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsNumberString()
    page?: string;

    @IsOptional()
    @IsNumberString()
    limit?: string;
}
