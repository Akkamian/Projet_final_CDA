import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Contrôle de propriété (RG-SEC-01, RG-SEC-02) : la condition « appartient à cet utilisateur » est dans la requête,
 * en remontant jusqu'à `users`. Une ressource d'un autre utilisateur et une ressource inexistante donnent la même
 * réponse : 404.
 */
@Injectable()
export class OwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  async findOwnedWatch(userId: number, watchId: number) {
    const watch = await this.prisma.watches.findFirst({ where: { id: watchId, user_id: userId } });
    if (!watch) throw new NotFoundException();
    return watch;
  }

  async findOwnedProject(userId: number, projectId: number) {
    const project = await this.prisma.restoration_projects.findFirst({
      where: { id: projectId, watches: { user_id: userId } },
    });
    if (!project) throw new NotFoundException();
    return project;
  }

  async findOwnedStep(userId: number, projectId: number, stepId: number) {
    const step = await this.prisma.restoration_steps.findFirst({
      where: { id: stepId, project_id: projectId, restoration_projects: { watches: { user_id: userId } } },
    });
    if (!step) throw new NotFoundException();
    return step;
  }
}
