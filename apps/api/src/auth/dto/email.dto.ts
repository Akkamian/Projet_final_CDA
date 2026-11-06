import { NormalizedEmail } from '../../common/normalized-email.decorator.js';

export class EmailDto {
  @NormalizedEmail()
  email: string;
}
