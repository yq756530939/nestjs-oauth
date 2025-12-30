import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async create(dto: Partial<AuditLog>) {
    const log = await this.auditLogRepo.create(dto);
    return this.auditLogRepo.save(log);
  }

  async findAll() {
    return this.auditLogRepo.find();
  }
}
