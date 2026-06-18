const libraryService = require('../services/library.service');

exports.getApprovedResources = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', resource_type = '' } = req.query;

    const { resources, meta } = await libraryService.getApprovedResources({
      page,
      limit,
      search,
      resource_type
    });

    res.status(200).json({
      success: true,
      data: resources,
      meta
    });
  } catch (error) {
    next(error);
  }
};

exports.getResourceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resource = await libraryService.getResourceById(id);

    res.status(200).json({
      success: true,
      data: resource
    });
  } catch (error) {
    next(error);
  }
};
