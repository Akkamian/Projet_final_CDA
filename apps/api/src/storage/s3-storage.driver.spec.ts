import { S3StorageDriver } from './s3-storage.driver.js';

describe('S3StorageDriver', () => {
  it('se construit sans réseau avec la configuration S3', () => {
    const driver = new S3StorageDriver({
      endpoint: 'https://s3.example.test',
      bucket: 'photos',
      accessKey: 'AK',
      secretKey: 'SK',
    });

    expect(driver).toBeInstanceOf(S3StorageDriver);
  });
});
