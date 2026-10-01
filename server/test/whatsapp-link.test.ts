/**
 * The WhatsApp button's links and number rules (shared/whatsapp.ts): pure
 * functions, no browser.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  normalizeWhatsAppNumber,
  whatsappMessage,
  whatsappNumberProblem,
  whatsappUrl
} from '../../shared/whatsapp';

const ORIGIN = 'https://example.test';
const NUMBER = '94771234567';

describe('WhatsApp links', () => {
  test('a tour: its name and its page, fully encoded', () => {
    const href = whatsappUrl(
      NUMBER,
      whatsappMessage({ kind: 'tour', id: 'island-in-7-days', title: 'Island in 7 Days' }, ORIGIN)
    );
    assert.equal(
      href,
      'https://wa.me/94771234567?text=' +
        "Hi!%20I'm%20interested%20in%20the%20Island%20in%207%20Days%20tour.%20" +
        'https%3A%2F%2Fexample.test%2Ftours%2Fisland-in-7-days'
    );
    assert.equal(
      new URL(href).searchParams.get('text'),
      "Hi! I'm interested in the Island in 7 Days tour. https://example.test/tours/island-in-7-days"
    );
  });

  test('a destination: its name and its page, fully encoded', () => {
    const href = whatsappUrl(
      NUMBER,
      whatsappMessage({ kind: 'destination', id: 'ella', name: 'Ella' }, ORIGIN)
    );
    assert.equal(
      href,
      'https://wa.me/94771234567?text=' +
        "Hi!%20I'd%20like%20to%20know%20more%20about%20visiting%20Ella.%20" +
        'https%3A%2F%2Fexample.test%2Fdestinations%2Fella'
    );
    assert.equal(
      new URL(href).searchParams.get('text'),
      "Hi! I'd like to know more about visiting Ella. https://example.test/destinations/ella"
    );
  });

  test('an experience: its name and its page, fully encoded', () => {
    const href = whatsappUrl(
      NUMBER,
      whatsappMessage({ kind: 'experience', id: 'safari-yala', title: 'Safari in Yala' }, ORIGIN)
    );
    assert.equal(
      href,
      'https://wa.me/94771234567?text=' +
        "Hi!%20I'm%20interested%20in%20the%20Safari%20in%20Yala%20experience.%20" +
        'https%3A%2F%2Fexample.test%2Fexperiences%2Fsafari-yala'
    );
  });

  test('anywhere else: the general message, with no link', () => {
    assert.equal(
      whatsappUrl(NUMBER, whatsappMessage({ kind: 'general' }, ORIGIN)),
      "https://wa.me/94771234567?text=Hi!%20I'd%20like%20help%20planning%20a%20trip%20to%20Sri%20Lanka."
    );
  });

  test('names with & ’ # ? survive the round trip, and spaces are %20, never +', () => {
    const name = 'Rock & Roll’s #1 Fort? Yes';
    const href = whatsappUrl(NUMBER, whatsappMessage({ kind: 'destination', id: 'x', name }, ORIGIN));
    const query = href.slice(href.indexOf('?') + 1);
    assert.doesNotMatch(query, /[ &#+]/);
    assert.equal(query.split('&').length, 1);
    assert.equal(
      new URL(href).searchParams.get('text'),
      `Hi! I'd like to know more about visiting ${name}. https://example.test/destinations/x`
    );
  });

  test('without a message: the bare number (the admin "Test in WhatsApp" link)', () => {
    assert.equal(whatsappUrl(NUMBER), 'https://wa.me/94771234567');
  });
});

describe('WhatsApp numbers', () => {
  test('spaces, dashes, dots, brackets and a leading + are stripped', () => {
    assert.equal(normalizeWhatsAppNumber(' +94 (77) 123-45.67 '), NUMBER);
  });

  test('good numbers pass', () => {
    for (const ok of [NUMBER, '14155552671', '4477001234', '12345678', '123456789012345']) {
      assert.equal(whatsappNumberProblem(ok), null, ok);
    }
  });

  test('each mistake gets its own message', () => {
    assert.match(whatsappNumberProblem('0771234567')!, /not 0/);
    assert.equal(whatsappNumberProblem('940771234567'), 'Remove the 0 after 94.');
    assert.match(whatsappNumberProblem('94a771234567')!, /digits only/);
    assert.match(whatsappNumberProblem('1234567')!, /8 to 15 digits/);
    assert.match(whatsappNumberProblem('1234567890123456')!, /8 to 15 digits/);
  });
});
