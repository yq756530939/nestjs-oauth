import { ValidationPipe } from '@nestjs/common';

export const globalValidationPipe = new ValidationPipe({
  transform: true, // 自动转换数据类型
  whitelist: true, // 剔除未装饰的属性
  forbidNonWhitelisted: true, // 非白名单属性抛错
  errorHttpStatusCode: 400,
});
