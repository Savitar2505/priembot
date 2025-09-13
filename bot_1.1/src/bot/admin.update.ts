import { Action, Command, Ctx, Message, Update } from 'nestjs-telegraf';
import { UserRole } from 'src/schemas/user.schema';
import { UserService } from 'src/user/user.service';
import { Context, Markup } from 'telegraf';
import { GroupService } from '../group/group.service';
import { RequisiteService } from '../requisite/requisite.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { UseGuards } from '@nestjs/common';
import { WithdrawService } from '../withdraw/withdraw.service';
import { OperationService } from '../operation/operation.service';

@Update()
@UseGuards(AdminGuard)
export class AdminUpdate {
  constructor(
    private readonly userService: UserService,
    private readonly groupService: GroupService,
    private readonly requisiteService: RequisiteService,
    private readonly withdrawService: WithdrawService,
    private readonly operationService: OperationService,
  ) {}
}
