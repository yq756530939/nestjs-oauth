import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from '../dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  private hashPassword(password): string {
    return bcrypt.hashSync(password, 10);
  }

  verifyPassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  }

  async create(dto: CreateUserDto) {
    const existUser = await this.findOneByUsername(dto.username);
    if (existUser) {
      throw new UnauthorizedException('用户名已存在');
    }

    const user = this.userRepo.create({
      ...dto,
      roles: dto.roles || [],
      password: this.hashPassword(dto.password),
    });
    return this.userRepo.save(user);
  }

  async findOneByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { username, status: 1 } });
  }

  async findOneById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id, status: 1 } });
  }
}
