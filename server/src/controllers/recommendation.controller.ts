import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import * as allocationService from '../services/allocation.service';
import * as recommendationService from '../services/recommendation.service';
import { RecommendationStatus, RecommendationType } from '../models/Recommendation.model';

export const generateRecommendationsController = asyncHandler(
  async (req: Request, res: Response) => {
    const { incidentId, patientIds } = req.body as {
      incidentId?: string;
      patientIds?: string[];
    };
    if (!incidentId) throw ApiError.badRequest('incidentId is required');

    const plan = await allocationService.generateRecommendationsForIncident(
      incidentId,
      req.user!.id,
      Array.isArray(patientIds) ? patientIds : []
    );

    res.status(201).json(
      new ApiResponse(
        201,
        plan,
        `Generated ${plan.recommendations.length} recommendation(s)` +
          (plan.reusedPending > 0 ? ` (${plan.reusedPending} existing pending reused)` : '') +
          ' — human approval required'
      )
    );
  }
);

export const getRecommendationsController = asyncHandler(
  async (req: Request, res: Response) => {
    const { incidentId, status, type } = req.query as {
      incidentId?: string;
      status?: RecommendationStatus;
      type?: RecommendationType;
    };

    if (status && !['pending', 'approved', 'rejected', 'overridden'].includes(status)) {
      throw ApiError.badRequest('Invalid status filter');
    }
    if (type && !['allocation', 'transfer', 'reserve', 'preparedness'].includes(type)) {
      throw ApiError.badRequest('Invalid type filter');
    }

    const recommendations = await recommendationService.getRecommendations({
      incidentId,
      status,
      type,
    });
    res.status(200).json(new ApiResponse(200, { recommendations }));
  }
);

export const getRecommendationByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    const recommendation = await recommendationService.getRecommendationById(req.params.id);
    res.status(200).json(new ApiResponse(200, recommendation));
  }
);

export const approveRecommendationController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await recommendationService.approveRecommendation(
      req.params.id,
      req.user!.id
    );
    res.status(200).json(
      new ApiResponse(
        200,
        result,
        `Recommendation approved — ${result.actionResults.filter((a) => a.success).length}/${result.actionResults.length} resource actions committed` +
          (result.siblingsRejected > 0 ? `, ${result.siblingsRejected} alternative(s) auto-rejected` : '')
      )
    );
  }
);

export const overrideRecommendationController = asyncHandler(
  async (req: Request, res: Response) => {
    const { reason } = req.body as { reason?: string };
    const recommendation = await recommendationService.overrideRecommendation(
      req.params.id,
      req.user!.id,
      reason ?? ''
    );
    res.status(200).json(
      new ApiResponse(200, recommendation, 'Recommendation overridden — decision recorded in audit log')
    );
  }
);
