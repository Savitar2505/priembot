import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { UserService } from '../../user/user.service';
import { UserRole } from '../../schemas/user.schema';

@Injectable()
export class OperatorGuard implements CanActivate {
  constructor(private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = TelegrafExecutionContext.create(context);
    const context1 = ctx.getContext<Context>();

    try {
      const user = await this.userService.getUserByTelegramId(context1.from.id);
      if (user.role !== UserRole.OPERATOR) {
        await context1.reply('🚫 Доступ только для операторов!');
        return false;
      }
      return true;
    } catch (e) {
      await context1.reply('❌ Пользователь не найден!');
      return false;
    }
  }
}
