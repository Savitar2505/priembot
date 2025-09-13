import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { RequisiteSchema } from '../schemas/requisite.schema';
import { RequisiteService } from './requisite.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Requisite', schema: RequisiteSchema }]),
    UserModule,
  ],
  providers: [RequisiteService],
  exports: [RequisiteService],
})
export class RequisiteModule {}
