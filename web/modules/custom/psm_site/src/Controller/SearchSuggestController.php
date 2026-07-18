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
   */
  private const LIMIT = 8;

  /**
   * Builds the JSON suggestion payload.
   */
  public function suggest(Request $request): CacheableJsonResponse {
    $query_text = trim((string) $request->query->get('q', ''));

    $storage = $this->entityTypeManager()->getStorage('node');
    $query = $storage->getQuery()
      ->accessCheck(TRUE)
      ->condition('type', 'catalogue_item')
      ->condition('status', 1)
      ->range(0, self::LIMIT)
      ->sort('created', 'DESC');

    if ($query_text !== '') {
      $query->condition('title', $query_text, 'CONTAINS');
    }

    $suggestions = [];
    $nids = $query->execute();

    if ($nids) {
      $repository = \Drupal::service('entity.repository');
      foreach ($storage->loadMultiple($nids) as $node) {
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
    }

    $response = new CacheableJsonResponse([
      'query' => $query_text,
      'items' => $suggestions,
    ]);

    $cacheability = (new CacheableMetadata())
      ->setCacheContexts(['url.query_args:q', 'languages:language_interface'])
      ->setCacheTags(['node_list:catalogue_item']);
    $response->addCacheableDependency($cacheability);

    return $response;
  }

}
