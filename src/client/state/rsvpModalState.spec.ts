/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { rsvpModal } from "./rsvpModalState";
import EventFactory from "@client/__tests__/utils/factories/eventFactory";
import { setQueryString } from "@client/__tests__/utils/locationHelpers";

it('starts with default values', () => {
  expect(rsvpModal.show).toBe(false);
  expect(rsvpModal.event).toBeUndefined()
});

describe('open', () => {
  it('opens the modal', () => {
    const event = new EventFactory().build();
    rsvpModal.open(event);

    expect(rsvpModal.show).toBe(true);
    expect(rsvpModal.event).toEqual(event);
  });
});

describe('close', () => {
  it('closes the modal', () => {
    rsvpModal.show = true;
    rsvpModal.event = new EventFactory().build();

    rsvpModal.close();

    expect(rsvpModal.show).toBe(false);
  });
});

describe('getEventId', () => {
  it('pulls the RSVP event id from the query parameter', () => {
    setQueryString('?rsvp=1234')

    expect(rsvpModal.getEventId()).toBe('1234');
  });

  it('returns null if event id is not present', () => {
    setQueryString('')

    expect(rsvpModal.getEventId()).toBe(null);
  });
});
