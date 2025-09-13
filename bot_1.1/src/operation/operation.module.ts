import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OperationSchema } from '../schemas/operation.schema';
import { OperationService } from './operation.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Operation', schema: OperationSchema }]),
  ],
  providers: [OperationService],
  exports: [OperationService],
})
export class OperationModule {}
