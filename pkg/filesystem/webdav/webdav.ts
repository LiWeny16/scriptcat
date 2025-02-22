import { AuthType, createClient, FileStat, WebDAVClient } from "webdav/web";
import FileSystem, { File, FileReader, FileWriter } from "../filesystem";
import { joinPath } from "../utils";
import { WebDAVFileReader, WebDAVFileWriter } from "./rw";

export default class WebDAVFileSystem implements FileSystem {
  client: WebDAVClient;

  url: string;

  basePath: string = "/";

  constructor(
    authType: AuthType | WebDAVClient,
    url?: string,
    username?: string,
    password?: string
  ) {
    if (typeof authType === "object") {
      this.client = authType;
      this.basePath = joinPath(url || "");
      this.url = username!;
    } else {
      this.url = url!;
      this.client = createClient(url!, {
        authType,
        username,
        password,
      });
    }
  }

  async verify(): Promise<void> {
    await this.client.getQuota();
    return Promise.resolve();
  }

  open(file: File): Promise<FileReader> {
    return Promise.resolve(
      new WebDAVFileReader(this.client, joinPath(file.path, file.name))
    );
  }

  openDir(path: string): Promise<FileSystem> {
    return Promise.resolve(
      new WebDAVFileSystem(this.client, joinPath(this.basePath, path), this.url)
    );
  }

  create(path: string): Promise<FileWriter> {
    return Promise.resolve(
      new WebDAVFileWriter(this.client, joinPath(this.basePath, path))
    );
  }

  createDir(path: string): Promise<void> {
    return this.client.createDirectory(joinPath(this.basePath, path));
  }

  async delete(path: string): Promise<void> {
    return this.client.deleteFile(joinPath(this.basePath, path));
  }

  async list(): Promise<File[]> {
    const dir = (await this.client.getDirectoryContents(
      this.basePath
    )) as FileStat[];
    const ret: File[] = [];
    dir.forEach((item: FileStat) => {
      if (item.type !== "file") {
        return;
      }
      ret.push({
        name: item.basename,
        path: this.basePath,
        digest: item.etag || "",
        size: item.size,
        createtime: new Date(item.lastmod).getTime(),
        updatetime: new Date(item.lastmod).getTime(),
      });
    });
    return Promise.resolve(ret);
  }

  getDirUrl(): Promise<string> {
    return Promise.resolve(this.url + this.basePath);
  }
}
