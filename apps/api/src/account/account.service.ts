import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { apiError } from '../common/api-error.js';
import { projectPhotoUrls } from '../photos/photo-urls.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Supprime le compte et, en cascade, toutes ses données (RG-CPT-15, RG-SEC-05), après vérification du mot de passe.
   * Même séquence que les autres suppressions : URL lues, lignes supprimées en transaction, fichiers effacés ensuite sans
   * faire échouer la requête. La garde globale refuse déjà tout jeton dont l'utilisateur n'existe plus.
   */
  async deleteAccount(userId: number, password: string): Promise<void> {
    const user = await this.prisma.users.findUniqueOrThrow({
      where: { id: userId },
      select: { password_hash: true },
    });
    if (!(await bcrypt.compare(password, user.password_hash))) {
      throw apiError(400, 'WRONG_PASSWORD', 'Le mot de passe est incorrect');
    }
    const urls = await this.prisma.$transaction(async (tx) => {
      const found = await projectPhotoUrls(tx, {
        watches: { user_id: userId },
      });
      await tx.users.delete({ where: { id: userId } });
      return found;
    });
    await Promise.all(urls.map((url) => this.storage.deleteQuietly(url)));
  }
}
