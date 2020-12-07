import {Injectable} from '@angular/core';
import {AppConfig} from '../../../config/app.config';
import {Observable, forkJoin, of} from 'rxjs';
import {timeout, map} from 'rxjs/operators';
import {ApiI2b2Panel} from '../../../models/api-request-models/medco-node/api-i2b2-panel';
import {ConstraintMappingService} from '../../constraint-mapping.service';
import {ApiEndpointService} from '../../api-endpoint.service';
import {GenomicAnnotationsService} from '../genomic-annotations.service';
import {ApiExploreQueryResult} from '../../../models/api-response-models/medco-node/api-explore-query-result';
import {ExploreQueryType} from '../../../models/query-models/explore-query-type';
import {MedcoNetworkService} from '../medco-network.service';
import {ExploreQuery} from '../../../models/query-models/explore-query';
import {CryptoService} from '../../crypto.service';
import {ErrorHelper} from '../../../utilities/error-helper';
import {ApiI2b2Timing} from 'app/models/api-request-models/medco-node/api-i2b2-timing';

@Injectable()
export class ExploreQueryService {

  /**
   * Query timeout: 10 minutes.
   */
  private static QUERY_TIMEOUT_MS = 1000 * 60 * 10;

  constructor(private config: AppConfig,
    private apiEndpointService: ApiEndpointService,
    private medcoNetworkService: MedcoNetworkService,
    private genomicAnnotationsService: GenomicAnnotationsService,
    private constraintMappingService: ConstraintMappingService,
    private cryptoService: CryptoService) { }

  //  ------------------- api calls ----------------------

  /**
   * @returns {Observable<number>} the resultId
   * @param queryId
   * @param queryTiming
   * @param userPublicKey
   * @param panels
   * @param nodeUrl
   * @param sync
   */
  private exploreQuerySingleNode(queryId: string, userPublicKey: string, panels: ApiI2b2Panel[],
    queryTiming: ApiI2b2Timing, nodeUrl: string, sync: boolean = true): Observable<ApiExploreQueryResult> {
    return this.apiEndpointService.postCall(
      'node/explore/query?sync=' + sync,
      {
        id: queryId,
        query: {
          queryTiming: queryTiming,
          userPublicKey: userPublicKey,
          panels: panels
        }
      },
      nodeUrl
    ).pipe(map((expQueryResp) => expQueryResp['result']));
  }

  // -------------------------------------- helper calls --------------------------------------

  /**
   * Execute simultaneously the specified MedCo query on all the nodes.
   * Ensures before execute that the token is still valid.
   *
   * @param queryId
   * @param queryTiming
   * @param userPublicKey
   * @param panels
   */
  private exploreQueryAllNodes(queryId: string, userPublicKey: string,
    panels: ApiI2b2Panel[], queryTiming: ApiI2b2Timing): Observable<ApiExploreQueryResult[]> {

    this.preparePanelTimings(panels, queryTiming)

    return forkJoin(this.medcoNetworkService.nodesUrl.map(
      (url) => this.exploreQuerySingleNode(queryId, userPublicKey, panels, queryTiming, url)
    )).pipe(timeout(ExploreQueryService.QUERY_TIMEOUT_MS));
  }

  /**
   *
   * @param query
   */
  exploreQuery(query: ExploreQuery): Observable<ApiExploreQueryResult[]> {
    return this.exploreQueryAllNodes(
      query.uniqueId,
      this.cryptoService.ephemeralPublicKey,
      this.constraintMappingService.mapConstraint(query.constraint),
      query.queryTimingSameInstanceNum ? ApiI2b2Timing.sameInstanceNum : ApiI2b2Timing.any
    );
  }

  // preparePanelTimings reset all panel timing to false if the query-level is false,
  // does nothing otherwise
  private preparePanelTimings(panels: ApiI2b2Panel[], queryTiming: ApiI2b2Timing): void {
    if (queryTiming === ApiI2b2Timing.any) {
      panels.forEach(panel => {
        panel.panelTiming = ApiI2b2Timing.any
      })
    }
  }
}
