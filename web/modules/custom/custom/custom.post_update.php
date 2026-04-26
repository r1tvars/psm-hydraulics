<?php

declare(strict_types=1);

use Drupal\taxonomy\Entity\Term;
use Drupal\taxonomy\Entity\Vocabulary;

/**
 * @file
 * Post-update hooks for the Custom module.
 */

/**
 * Seeds the product category vocabulary with starter terms.
 */
function custom_post_update_seed_product_category_terms(): void {
  $vocabulary = Vocabulary::load('product_category');
  if (!$vocabulary) {
    return;
  }

  $terms = [
    'Pumps',
    'Valves',
    'Cylinders',
    'Hoses',
  ];

  foreach ($terms as $name) {
    $existing = \Drupal::entityTypeManager()
      ->getStorage('taxonomy_term')
      ->loadByProperties([
        'vid' => 'product_category',
        'name' => $name,
      ]);

    if ($existing) {
      continue;
    }

    Term::create([
      'vid' => 'product_category',
      'name' => $name,
      'langcode' => 'en-gb',
    ])->save();
  }
}
