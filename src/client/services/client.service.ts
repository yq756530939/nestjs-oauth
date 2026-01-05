import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateClientDto } from '../dto/create-client.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { OauthClient } from '../entities/oauth-client.entity';
import { In, Not, Repository } from 'typeorm';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(OauthClient)
    private readonly clientRepo: Repository<OauthClient>,
  ) {}

  async create(dto: CreateClientDto): Promise<OauthClient> {
    const existClient = await this.findOneByClientId(dto.clientId);
    if (existClient) {
      throw new UnauthorizedException('客户端ID已存在');
    }

    const client = this.clientRepo.create({
      ...dto,
      scopes: dto.scopes || ['openid', 'profile', 'email'],
      clientSecret: OauthClient.hashClientSecret(dto.clientSecret),
    });
    return this.clientRepo.save(client);
  }

  async findOneByClientId(clientId: string): Promise<OauthClient | null> {
    return this.clientRepo.findOne({ where: { clientId, status: 1 } });
  }

  async validateRedirectUri(
    clientId: string,
    redirectUri: string,
  ): Promise<boolean> {
    const client = await this.findOneByClientId(clientId);
    return client ? client.redirectUris.includes(redirectUri) : false;
  }

  async findClientsWithLogoutUri(clientIds: string[]): Promise<OauthClient[]> {
    if (clientIds.length === 0) return [];
    return this.clientRepo
      .createQueryBuilder('client')
      .select(['client.clientId', 'client.frontChannelLogoutUri'])
      .where('client.clientId IN (:...clientIds)', { clientIds })
      .andWhere('client.status = :status', { status: 1 })
      .andWhere('client.frontChannelLogoutUri IS NOT NULL')
      .getMany();
  }
}
