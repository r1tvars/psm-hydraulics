<?php

declare(strict_types=1);

namespace Drupal\psm_site\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;

/**
 * Defines the site settings form for the frontend header.
 */
final class SiteSettingsForm extends ConfigFormBase {

  /**
   * {@inheritdoc}
   */
  public function getFormId(): string {
    return 'psm_site_settings_form';
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames(): array {
    return ['psm_site.settings'];
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state): array {
    $config = $this->config('psm_site.settings');

    $form['phone'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Phone number'),
      '#default_value' => $config->get('phone'),
      '#maxlength' => 64,
      '#required' => TRUE,
    ];

    $form['email'] = [
      '#type' => 'email',
      '#title' => $this->t('Email address'),
      '#default_value' => $config->get('email'),
      '#maxlength' => 128,
      '#required' => TRUE,
    ];

    $form['location'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Location'),
      '#default_value' => $config->get('location'),
      '#maxlength' => 255,
      '#required' => TRUE,
    ];

    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state): void {
    $this->configFactory()->getEditable('psm_site.settings')
      ->set('phone', $form_state->getValue('phone'))
      ->set('email', $form_state->getValue('email'))
      ->set('location', $form_state->getValue('location'))
      ->save();

    parent::submitForm($form, $form_state);
  }

}
