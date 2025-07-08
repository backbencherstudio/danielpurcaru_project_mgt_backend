import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoanStatus } from '@prisma/client';
import { FileUrlHelper } from 'src/common/helper/file-url.helper';

@Injectable()
export class EmployeeLoanService {
    constructor(private readonly prisma: PrismaService) { }

    async createLoanRequest(dto: { user_id: string, loan_amount: number, loan_purpose?: string, notes?: string }) {
        try {
            const loan = await this.prisma.employeeLoan.create({
                data: {
                    user_id: dto.user_id,
                    loan_amount: dto.loan_amount,
                    loan_purpose: dto.loan_purpose,
                    notes: dto.notes,
                    loan_status: 'PENDING',
                },
            });
            return { success: true, data: loan };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async updateLoan(id: string, dto: { loan_amount?: number, loan_purpose?: string, notes?: string, loan_status?: string }) {
        try {
            const updateData: any = { ...dto };
            if (dto.loan_status) {
                updateData.loan_status = dto.loan_status as LoanStatus;
            }
            const loan = await this.prisma.employeeLoan.update({
                where: { id },
                data: updateData,
            });
            return { success: true, data: loan };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async deleteLoan(id: string) {
        try {
            const loan = await this.prisma.employeeLoan.delete({ where: { id } });
            return { success: true, data: loan };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async findAllLoans() {
        try {
            const loans = await this.prisma.employeeLoan.findMany({
                where: { deleted_at: null },
                orderBy: { created_at: 'desc' },
                select: {
                    id: true,
                    user_id: true,
                    loan_amount: true,
                    loan_purpose: true,
                    loan_status: true,
                    notes: true,
                    created_at: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true,
                        }
                    }
                },
            });
            const loansWithAvatar = loans.map(loan => ({
                ...loan,
                user: loan.user ? FileUrlHelper.addAvatarUrl(loan.user) : null,
            }));
            return { success: true, data: loansWithAvatar };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async findEmployeeLoans(user_id: string) {
        try {
            const loans = await this.prisma.employeeLoan.findMany({
                where: { user_id, deleted_at: null },
                orderBy: { created_at: 'desc' },
                select: {
                    id: true,
                    loan_amount: true,
                    loan_purpose: true,
                    loan_status: true,
                    notes: true,
                    created_at: true,
                },
            });
            return { success: true, data: loans };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

