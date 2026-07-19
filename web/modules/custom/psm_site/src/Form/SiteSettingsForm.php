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

    $form['sections'] = [
      '#type' => 'vertical_tabs',
      '#title' => $this->t('PSM site settings'),
    ];

    $form['contact_details'] = [
      '#type' => 'details',
      '#title' => $this->t('Contact details'),
      '#description' => $this->t('These values are used in the site header and other public-facing contact areas.'),
      '#group' => 'sections',
      '#open' => TRUE,
    ];

    $form['contact_details']['phone'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Phone number'),
      '#default_value' => $config->get('phone'),
      '#maxlength' => 64,
      '#required' => TRUE,
      '#placeholder' => '+07 554 332 322',
    ];

    $form['contact_details']['email'] = [
      '#type' => 'email',
      '#title' => $this->t('Email address'),
      '#default_value' => $config->get('email'),
      '#maxlength' => 128,
      '#required' => TRUE,
      '#placeholder' => 'contact@example.com',
    ];

    $form['contact_details']['location'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Location'),
      '#default_value' => $config->get('location'),
      '#maxlength' => 255,
      '#required' => TRUE,
      '#placeholder' => '37 San Fairport, NY 14450',
    ];

    $form['social_links'] = [
      '#type' => 'details',
      '#title' => $this->t('Social links'),
      '#description' => $this->t('Add full public URLs for the social platforms you want to show in the header. Leave any field empty to hide it.'),
      '#group' => 'sections',
      '#open' => FALSE,
    ];

    $form['social_links']['facebook_url'] = [
      '#type' => 'url',
      '#title' => $this->t('Facebook URL'),
      '#default_value' => $config->get('facebook_url') ?? '',
      '#maxlength' => 255,
      '#placeholder' => 'https://facebook.com/your-page',
    ];

    $form['social_links']['instagram_url'] = [
      '#type' => 'url',
      '#title' => $this->t('Instagram URL'),
      '#default_value' => $config->get('instagram_url') ?? '',
      '#maxlength' => 255,
      '#placeholder' => 'https://instagram.com/your-account',
    ];

    $form['social_links']['linkedin_url'] = [
      '#type' => 'url',
      '#title' => $this->t('LinkedIn URL'),
      '#default_value' => $config->get('linkedin_url') ?? '',
      '#maxlength' => 255,
      '#placeholder' => 'https://linkedin.com/company/your-company',
    ];

    $form['social_links']['x_url'] = [
      '#type' => 'url',
      '#title' => $this->t('X URL'),
      '#default_value' => $config->get('x_url') ?? '',
      '#maxlength' => 255,
      '#placeholder' => 'https://x.com/your-account',
    ];

    $form['general'] = [
      '#type' => 'details',
      '#title' => $this->t('Calls to action & footer'),
      '#description' => $this->t('Used by the "Request a quote" buttons in the header, mobile menu and footer, and by the footer intro text.'),
      '#group' => 'sections',
      '#open' => FALSE,
    ];

    $webform_options = [];
    if (\Drupal::moduleHandler()->moduleExists('webform')) {
      foreach (\Drupal::entityTypeManager()->getStorage('webform')->loadMultiple() as $webform_id => $webform) {
        $webform_options[$webform_id] = $webform->label();
      }
    }

    $form['general']['quote_webform'] = [
      '#type' => 'select',
      '#title' => $this->t('Quote form (opens in a popup)'),
      '#options' => $webform_options,
      '#empty_option' => $this->t('- None -'),
      '#default_value' => $config->get('quote_webform') ?? '',
      '#description' => $this->t('The webform opened in a popup by the quote buttons. When set, it takes precedence over the link below.'),
    ];

    $form['general']['quote_url'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Request a quote link (fallback)'),
      '#default_value' => $config->get('quote_url') ?? '',
      '#maxlength' => 255,
      '#description' => $this->t('Used only when no quote form is selected above. Internal path (e.g. /contact) or full URL. If both are empty, the quote buttons are hidden.'),
      '#placeholder' => '/contact',
    ];

    $form['general']['footer_text'] = [
      '#type' => 'textarea',
      '#title' => $this->t('Footer intro text'),
      '#default_value' => $config->get('footer_text') ?? '',
      '#rows' => 3,
      '#description' => $this->t('Short company description shown next to the logo in the footer.'),
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
      ->set('facebook_url', $form_state->getValue('facebook_url'))
      ->set('instagram_url', $form_state->getValue('instagram_url'))
      ->set('linkedin_url', $form_state->getValue('linkedin_url'))
      ->set('x_url', $form_state->getValue('x_url'))
      ->set('quote_webform', $form_state->getValue('quote_webform'))
      ->set('quote_url', $form_state->getValue('quote_url'))
      ->set('footer_text', $form_state->getValue('footer_text'))
      ->save();

    parent::submitForm($form, $form_state);
  }

}
