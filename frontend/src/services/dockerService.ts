import api from './api';

export interface DockerImage {
  id: string;
  repoTags: string[];
  size: number;
  created: number;
}

export interface ImageValidation {
  imageName: string;
  tag: string;
  localExists: boolean;
  registryExists: boolean;
  exists: boolean;
}

export const dockerService = {
  /**
   * 列出本地 Docker 镜像
   */
  getLocalImages: async (): Promise<DockerImage[]> => {
    const resp = await api.get<DockerImage[]>('/docker/images');
    return resp.data;
  },

  /**
   * 列出 Registry 中的仓库
   */
  getRegistryRepositories: async (): Promise<string[]> => {
    const resp = await api.get<string[]>('/docker/registry/repositories');
    return resp.data;
  },

  /**
   * 列出 Registry 仓库的标签
   */
  getRegistryTags: async (repository: string): Promise<string[]> => {
    const resp = await api.get<string[]>(`/docker/registry/repositories/${encodeURIComponent(repository)}/tags`);
    return resp.data;
  },

  /**
   * 验证镜像是否存在
   */
  validateImage: async (imageName: string, tag = 'latest'): Promise<ImageValidation> => {
    const resp = await api.get<ImageValidation>('/docker/registry/validate', {
      params: { imageName, tag },
    });
    return resp.data;
  },
};

export default dockerService;
