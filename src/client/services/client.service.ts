import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateClientDto } from '../dto/create-client.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { OauthClient } from '../entities/oauth-client.entity';
import { Repository } from 'typeorm';

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
    if (!client) return false;
    return client.redirectUris.includes(redirectUri);
  }
}
