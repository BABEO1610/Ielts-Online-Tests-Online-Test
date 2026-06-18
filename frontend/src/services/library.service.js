import api from './api';

export const getLibraryResources = async (params = {}) => {
  const { page = 1, limit = 10, search = '', resource_type = '' } = params;
  const response = await api.get('/library', {
    params: { page, limit, search, resource_type }
  });
  return response.data;
};

export const getLibraryResourceById = async (id) => {
  const response = await api.get(`/library/${id}`);
  return response.data;
};
