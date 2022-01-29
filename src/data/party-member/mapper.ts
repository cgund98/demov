import {Mapper} from '../mapper';
import {Member, DynamoMember} from './entity';

/**
 * MemberMapper maps party objects between state store and logical formats.
 */
export const MemberMapper: Mapper<Member, DynamoMember> = class {
  // Convert to state store format
  public static toDB(member: Member): DynamoMember {
    return {
      pk: `party#${member.partyId}#members`,
      sk: `party-member#${member.memberId}`,
      sk2: member.joinTime,
      name: member.name,
      swiped: member.swiped,
    };
  }

  // Convert from state store format
  public static fromDB(dyMember: DynamoMember): Member {
    return {
      partyId: dyMember.pk.split('#')[1],
      memberId: dyMember.sk.split('#')[1],
      joinTime: dyMember.sk2,
      name: dyMember.name,
      swiped: dyMember.swiped,
    };
  }
};
