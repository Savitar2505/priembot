import { UserService } from 'src/user/user.service';
import { GroupService } from '../group/group.service';
import { RequisiteService } from '../requisite/requisite.service';
import { WithdrawService } from '../withdraw/withdraw.service';
import { OperationService } from '../operation/operation.service';
export declare class AdminUpdate {
    private readonly userService;
    private readonly groupService;
    private readonly requisiteService;
    private readonly withdrawService;
    private readonly operationService;
    constructor(userService: UserService, groupService: GroupService, requisiteService: RequisiteService, withdrawService: WithdrawService, operationService: OperationService);
}
