import { S3 } from 'aws-sdk';
import * as path from 'path';
import * as fs from 'fs';
import * as semver from 'semver';
import { glob } from 'glob';

export interface DeployOptions {
  /**
   * AWS S3 bucket name
   */
  bucket: string;
  
  /**
   * Package name
   */
  packageName: string;
  
  /**
   * Package version (semver)
   */
  version: string;
  
  /**
   * Path to the directory containing files to deploy
   */
  sourcePath: string;
  
  /**
   * AWS region
   */
  region?: string;
  
  /**
   * Base path to deploy to in the S3 bucket
   */
  basePath?: string;
  
  /**
   * Additional options to pass to S3 upload
   */
  s3Options?: S3.PutObjectRequest;
  
  /**
   * Whether to force deployment even if the version already exists
   */
  force?: boolean;
}

export class S3Deployer {
  private s3: S3;
  private options: DeployOptions;

  constructor(options: DeployOptions) {
    this.options = {
      region: 'us-east-1',
      basePath: '',
      force: false,
      ...options,
    };

    this.s3 = new S3({
      region: this.options.region,
    });
  }

  /**
   * Check if a version already exists in the S3 bucket
   */
  private async versionExists(): Promise<boolean> {
    const { bucket, packageName, version, basePath } = this.options;
    const majorVersion = semver.major(version);
    const minorVersion = semver.minor(version);
    
    const prefix = path.join(
      basePath || '',
      packageName,
      `${majorVersion}.${minorVersion}`,
      version
    ).replace(/\\/g, '/');
    
    try {
      const response = await this.s3.listObjectsV2({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 1,
      }).promise();
      
      return !!response.Contents && response.Contents.length > 0;
    } catch (error) {
      console.error('Error checking if version exists:', error);
      return false;
    }
  }
  
  /**
   * Deploy the package to S3 with the appropriate versioned structure
   */
  public async deploy(): Promise<{ success: boolean; uploaded: string[] }> {
    const { bucket, packageName, version, sourcePath, basePath, force } = this.options;
    
    // Validate the version is a valid semver
    if (!semver.valid(version)) {
      throw new Error(`Invalid version: ${version}. Must be a valid semver version.`);
    }
    
    // Check if directory exists
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source directory does not exist: ${sourcePath}`);
    }
    
    // Check if this version already exists
    const exists = await this.versionExists();
    if (exists && !force) {
      throw new Error(
        `Version ${version} of ${packageName} already exists in bucket ${bucket}. Use --force to override.`
      );
    }
    
    // Parse the semver to get major and minor versions
    const majorVersion = semver.major(version);
    const minorVersion = semver.minor(version);
    
    // Create the versioned path structure
    const versionedBasePath = path.join(
      basePath || '',
      packageName,
      `${majorVersion}.${minorVersion}`,
      version
    ).replace(/\\/g, '/');
    
    // Find all files to upload
    const files = await glob('**/*', { cwd: sourcePath, nodir: true });
    
    // Upload each file
    const uploaded: string[] = [];
    
    for (const file of files) {
      const filePath = path.join(sourcePath, file);
      const key = `${versionedBasePath}/${file}`.replace(/\\/g, '/');
      
      const params: S3.PutObjectRequest = {
        Bucket: bucket,
        Key: key,
        Body: fs.createReadStream(filePath),
        ContentType: this.getContentType(filePath),
        ...this.options.s3Options,
      };
      
      try {
        await this.s3.putObject(params).promise();
        uploaded.push(key);
      } catch (error) {
        console.error(`Error uploading ${filePath}:`, error);
        return { success: false, uploaded };
      }
    }
    
    // Also upload to the latest directory
    const latestPath = path.join(
      basePath || '',
      packageName, 
      'latest'
    ).replace(/\\/g, '/');
    
    for (const file of files) {
      const filePath = path.join(sourcePath, file);
      const key = `${latestPath}/${file}`.replace(/\\/g, '/');
      
      const params: S3.PutObjectRequest = {
        Bucket: bucket,
        Key: key,
        Body: fs.createReadStream(filePath),
        ContentType: this.getContentType(filePath),
        ...this.options.s3Options,
      };
      
      try {
        await this.s3.putObject(params).promise();
        uploaded.push(key);
      } catch (error) {
        console.error(`Error uploading to latest ${filePath}:`, error);
      }
    }
    
    return { success: true, uploaded };
  }
  
  /**
   * Get the content type for a file based on its extension
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const contentTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain',
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }
}

export default S3Deployer; 