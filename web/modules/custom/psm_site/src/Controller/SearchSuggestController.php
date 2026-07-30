<?php

declare(strict_types=1);

namespace Drupal\psm_site\Controller;

use Drupal\Core\Cache\CacheableJsonResponse;
use Drupal\Core\Cache\CacheableMetadata;
use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Returns catalogue item suggestions for the header search box.
 */
final class SearchSuggestController extends ControllerBase {

  /**
   * Maximum number of suggestions returned per request.
   *
   * Also the number of curated slots offered in SiteSettingsForm.
   */
  public const LIMIT = 8;

  /**
   * Builds the JSON suggestion payload.
   */
  public function suggest(Request $request): CacheableJsonResponse {
    $query_text = trim((string) $request->query->get('q', ''));

    $storage = $this->entityTypeManager()->getStorage('node');
    $nodes = [];

    // Empty query ("Popular searches"): the curated list from PSM site
    // settings, in its configured order.
    if ($query_text === '') {
      $curated_ids = array_values(array_filter(array_map(
        'intval',
        (array) $this->config('psm_site.settings')->get('popular_products'),
      )));
      if ($curated_ids !== []) {
        $loaded = $storage->loadMultiple($curated_ids);
        foreach ($curated_ids as $nid) {
          $node = $loaded[$nid] ?? NULL;
          if ($node && $node->bundle() === 'catalogue_item' && $node->access('view')) {
            $nodes[] = $node;
            if (count($nodes) >= self::LIMIT) {
              break;
            }
          }
        }
      }
    }

    // Typed query, or no curated list: newest matching products.
    if ($nodes === []) {
      $query = $storage->getQuery()
        ->accessCheck(TRUE)
        ->condition('type', 'catalogue_item')
        ->condition('status', 1)
        ->range(0, self::LIMIT)
        ->sort('created', 'DESC');

      if ($query_text !== '') {
        $query->condition('title', $query_text, 'CONTAINS');
      }

      $nodes = array_values($storage->loadMultiple($query->execute()));
    }

    $suggestions = [];
    $repository = \Drupal::service('entity.repository');
    foreach ($nodes as $node) {
      $node = $repository->getTranslationFromContext($node);

      $category = '';
      if ($node->hasField('field_product_category') && !$node->get('field_product_category')->isEmpty()) {
        $term = $node->get('field_product_category')->entity;
        if ($term) {
          $category = (string) $repository->getTranslationFromContext($term)->label();
        }
      }

      $suggestions[] = [
        'title' => (string) $node->label(),
        'category' => $category,
        'url' => $node->toUrl()->toString(),
      ];
    }

    $response = new CacheableJsonResponse([
      'query' => $query_text,
      'items' => $suggestions,
    ]);

    $cacheability = (new CacheableMetadata())
      ->setCacheContexts(['url.query_args:q', 'languages:language_interface'])
      ->setCacheTags(['node_list:catalogue_item', 'config:psm_site.settings']);
    $response->addCacheableDependency($cacheability);

    return $response;
  }

}
