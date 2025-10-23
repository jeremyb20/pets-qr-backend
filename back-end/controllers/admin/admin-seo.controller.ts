import { FlattenMaps } from 'mongoose';
import Seo, { ISeo, SeoFilters } from '../../models/Seo.model';
import { Request, Response, NextFunction } from 'express';
import { ApiResponse, ErrorResponse } from '../../types/response.type';

interface SeoQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  pageId?: string;
  route?: string;
  status?: string;
  contentType?: string;
  language?: string;
  hasCanonical?: string;
  hasOgImage?: string;
  priority?: string;
  changeFrequency?: string;
  startDate?: string;
  endDate?: string;
}

const adminSeoCtrl = {
  getAllSeoList: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '10',
        search = '',
        pageId = '',
        route = '',
        status = '',
        contentType = '',
        language = '',
        hasCanonical = '',
        hasOgImage = '',
        priority = '',
        changeFrequency = '',
        startDate = '',
        endDate = '',
      } = req.query as SeoQueryParams;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      let filter: SeoFilters = {};

      // Búsqueda general en múltiples campos
      if (search) {
        filter.$or = [
          { pageId: { $regex: search, $options: 'i' } },
          { route: { $regex: search, $options: 'i' } },
          { 'multiLanguageContent.title': { $regex: search, $options: 'i' } },
          {
            'multiLanguageContent.description': {
              $regex: search,
              $options: 'i',
            },
          },
          {
            'multiLanguageContent.keywords': { $regex: search, $options: 'i' },
          },
        ];
      }

      // Filtro por pageId específico
      if (pageId) {
        filter.pageId = { $regex: pageId, $options: 'i' };
      }

      // Filtro por ruta
      if (route) {
        filter.route = { $regex: route, $options: 'i' };
      }

      // Filtro por status
      if (status && status !== 'all') {
        filter.status = status;
      }

      // Filtro por tipo de contenido
      if (contentType && contentType !== 'all') {
        filter.contentType = contentType;
      }

      // Filtro por idioma
      if (language && language !== 'all') {
        filter['multiLanguageContent.language'] = language;
      }

      // Filtro por canonical URL
      // if (hasCanonical && hasCanonical !== 'all') {
      //   if (hasCanonical === 'with') {
      //     filter['multiLanguageContent.canonicalUrl'] = { $exists: true, $ne: '' };
      //   } else if (hasCanonical === 'without') {
      //     filter['multiLanguageContent.canonicalUrl'] = { $exists: true, $eq: '' };
      //   }
      // }

      // // Filtro por OG Image
      // if (hasOgImage && hasOgImage !== 'all') {
      //   if (hasOgImage === 'with') {
      //     filter['multiLanguageContent.ogImage'] = { $exists: true, $ne: '' };
      //   } else if (hasOgImage === 'without') {
      //     filter['multiLanguageContent.ogImage'] = { $exists: true, $eq: '' };
      //   }
      // }

      // Filtro por prioridad
      if (priority && priority !== 'all') {
        const priorityNum = parseFloat(priority);
        if (!isNaN(priorityNum)) {
          filter.priority = { $gte: priorityNum, $lte: priorityNum };
        } else {
          // Filtros por rangos de prioridad
          switch (priority) {
            case 'high':
              filter.priority = { $gte: 0.8, $lte: 1.0 };
              break;
            case 'medium':
              filter.priority = { $gte: 0.4, $lte: 0.7 };
              break;
            case 'low':
              filter.priority = { $gte: 0.0, $lte: 0.3 };
              break;
          }
        }
      }

      // Filtro por frecuencia de cambio
      if (changeFrequency && changeFrequency !== 'all') {
        filter.changeFrequency = changeFrequency;
      }

      // Filtro por fecha de modificación
      if (startDate || endDate) {
        filter.lastModified = {};
        if (startDate) {
          filter.lastModified.$gte = new Date(startDate);
        }
        if (endDate) {
          filter.lastModified.$lte = new Date(endDate);
        }
      }

      const startTime = Date.now();

      const [totalSeo, seoRecords] = await Promise.all([
        Seo.countDocuments(filter),
        Seo.find(filter)
          .select(
            '_id pageId route contentType status priority changeFrequency lastModified multiLanguageContent createdAt updatedAt createdBy updatedBy'
          )
          .populate({
            path: 'createdBy',
            select: 'name email',
          })
          .populate({
            path: 'updatedBy',
            select: 'name email',
          })
          .skip(skip)
          .limit(limitNum)
          .sort({ lastModified: -1 })
          .lean(),
      ]);

      const dbQueryTime = Date.now() - startTime;
      console.log(`📊 SEO MongoDB query took: ${dbQueryTime}ms`);

      // Transformar los datos para la respuesta
      const payload = seoRecords.map((item: FlattenMaps<ISeo>) => {
        // Obtener idiomas disponibles
        const languages =
          item.multiLanguageContent?.map((content) => content.language) || [];

        // Obtener contenido del primer idioma para mostrar en la lista
        const primaryContent = item.multiLanguageContent?.[0] || {};

        return {
          _id: item._id,
          pageId: item.pageId,
          route: item.route,
          contentType: item.contentType,
          status: item.status,
          priority: item.priority,
          changeFrequency: item.changeFrequency,
          lastModified: item.lastModified,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          createdBy: item.createdBy,
          updatedBy: item.updatedBy,
          multiLanguageContent: item.multiLanguageContent,
          // Campos adicionales para fácil acceso en el frontend
          title: primaryContent.title || '',
          description: primaryContent.description || '',
          languages: languages,
          hasCanonical: !!primaryContent.canonicalUrl,
          hasOgImage: !!primaryContent.ogImage,
        };
      });

      const response: ApiResponse<typeof payload> = {
        success: true,
        payload,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalSeo,
          pages: Math.ceil(totalSeo / limitNum),
        },
      };

      const totalTime = Date.now() - startTime;
      console.log(
        `✅ SEO request completed in ${totalTime}ms (DB: ${dbQueryTime}ms)`
      );

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Error fetching SEO records:', error);

      const errorResponse: ErrorResponse = {
        success: false,
        message: 'An error occurred while fetching SEO records.',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      };
      res.status(500).json(errorResponse);
    }
  },

  createSeo: async (req: Request, res: Response): Promise<void> => {
    try {
      const newSeo = new Seo(req.body);
      await newSeo.save();
      res.status(201).send({ success: true, msg: 'SEO record created' });
    } catch (error) {
      console.error('Error creating SEO record:', error);
      res.status(500).send({
        success: false,
        msg: 'Error creating SEO record',
        error: error,
      });
    }
  },
  updateSeoById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.body;
      await Seo.findByIdAndUpdate(id, req.body);
      res.status(200).send({ success: true, msg: 'SEO record updated' });
    } catch (error) {
      console.error('Error updating SEO record:', error);
      res.status(500).send({
        success: false,
        msg: 'Error updating SEO record',
        error: error,
      });
    }
  },

  getSeoById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.query;
      if (!id) {
        res.status(400).send({ success: false, msg: 'SEO ID is required' });
        return;
      }
      const seo = await Seo.findById(id);
      res.status(200).send({ success: true, payload: seo });
    } catch (error) {
      console.error('Error fetching SEO record:', error);
      res.status(500).send({
        success: false,
        msg: 'Error fetching SEO record',
        error: error,
      });
    }
  },

  // getSeoByPageId: async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const { pageId } = req.params;
  //     const { language } = req.query; // Opcional: filtrar por idioma
  //     console.log(req.params, '*******', req.query);
  //     let query: any = { pageId };

  //     // Si se especifica un idioma, filtrar el contenido multiidioma
  //     if (language) {
  //       query['multiLanguageContent.language'] = language;
  //     }

  //     const seoRecord = await Seo.findOne(query)
  //       .populate({
  //         path: 'createdBy',
  //         select: 'name email',
  //       })
  //       .populate({
  //         path: 'updatedBy',
  //         select: 'name email',
  //       })
  //       .lean();

  //     if (!seoRecord) {
  //       const errorResponse: ErrorResponse = {
  //         success: false,
  //         message: 'SEO record not found for the specified pageId',
  //       };
  //       res.status(404).json(errorResponse);
  //       return;
  //     }

  //     // Filtrar contenido por idioma si se especificó
  //     if (language && seoRecord.multiLanguageContent) {
  //       seoRecord.multiLanguageContent = seoRecord.multiLanguageContent.filter(
  //         (content: any) => content.language === language
  //       );
  //     }

  //     const response: ApiResponse<ISeo> = {
  //       success: true,
  //       payload: seoRecord as ISeo,
  //     };

  //     res.status(200).json(response);
  //   } catch (error) {
  //     console.error('❌ Error fetching SEO record by pageId:', error);

  //     const errorResponse: ErrorResponse = {
  //       success: false,
  //       message: 'An error occurred while fetching the SEO record.',
  //       error: process.env.NODE_ENV === 'development' ? error : undefined,
  //     };
  //     res.status(500).json(errorResponse);
  //   }
  // },

  getSeoByPageId: async (req: Request, res: Response): Promise<void> => {
    try {
      const { pageId } = req.params;
      const { language = 'ES' } = req.query;

      console.log(`🔍 Buscando SEO para: ${pageId}, idioma: ${language}`);

      if (!pageId) {
        res.status(400).json({
          success: false,
          message: 'pageId parameter is required',
        });
        return;
      }

      const seoRecord = await Seo.findOne({
        pageId: pageId,
        status: 'active',
      })
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .lean();

      if (!seoRecord) {
        console.log(`❌ SEO no encontrado para: ${pageId}`);
        res.status(404).json({
          success: false,
          message: 'SEO record not found',
        });
        return;
      }

      console.log(`✅ SEO encontrado: ${seoRecord.pageId}`);

      // Filtrar por idioma si se especifica
      if (seoRecord.multiLanguageContent && language) {
        const filteredContent = seoRecord.multiLanguageContent.filter(
          (content: any) => content.language === language
        );
        seoRecord.multiLanguageContent =
          filteredContent.length > 0
            ? filteredContent
            : [seoRecord.multiLanguageContent[0]];
      }

      res.status(200).json({
        success: true,
        payload: seoRecord,
      });
    } catch (error) {
      console.error('❌ Error en getSeoByPageId:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  },
};
export default adminSeoCtrl;
