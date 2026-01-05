import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  clientSecret: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsNotEmpty()
  redirectUris: string[];

  @IsArray()
  scopes?: string[];

  @IsString()
  @IsOptional()
  frontChannelLogoutUri?: string;
}
