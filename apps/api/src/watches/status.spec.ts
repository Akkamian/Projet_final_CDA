import { computeStatus } from './status.js';

describe('computeStatus', () => {
  it('RG-AFF-02 une montre vendue affiche « sold » même si son dernier projet est terminé', () => {
    expect(computeStatus({ resaleDate: '2025-06-01', latestProjectStatus: 'completed' })).toBe('sold');
  });

  it('RG-AFF-02 une montre vendue sans projet affiche « sold »', () => {
    expect(computeStatus({ resaleDate: '2025-06-01', latestProjectStatus: null })).toBe('sold');
  });

  it('RG-AFF-05 une montre sans projet a le statut no_project', () => {
    expect(computeStatus({ resaleDate: null, latestProjectStatus: null })).toBe('no_project');
  });

  it('une montre non vendue prend le statut de son dernier projet', () => {
    expect(computeStatus({ resaleDate: null, latestProjectStatus: 'in_progress' })).toBe('in_progress');
    expect(computeStatus({ resaleDate: null, latestProjectStatus: 'completed' })).toBe('completed');
  });
});
