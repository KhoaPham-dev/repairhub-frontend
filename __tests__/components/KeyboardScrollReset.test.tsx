import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import KeyboardScrollReset from '@/components/KeyboardScrollReset';

type VV = { height: number; addEventListener: jest.Mock; removeEventListener: jest.Mock };

describe('KeyboardScrollReset', () => {
  let scrollTo: jest.SpyInstance;

  const setScrollY = (v: number) =>
    Object.defineProperty(window, 'scrollY', { value: v, configurable: true, writable: true });

  beforeEach(() => {
    jest.useFakeTimers();
    scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
    setScrollY(0);
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.useRealTimers();
    scrollTo.mockRestore();
    // @ts-expect-error cleanup
    delete window.visualViewport;
  });

  function mount() {
    const input = document.createElement('input');
    const other = document.createElement('textarea');
    const btn = document.createElement('button');
    document.body.append(input, other, btn);
    const utils = render(<KeyboardScrollReset />);
    return { input, other, btn, ...utils };
  }

  it('renders nothing', () => {
    const { container } = mount();
    expect(container.firstChild).toBeNull();
  });

  it('resets window scroll after blur when nothing editable is focused', () => {
    const { input, btn } = mount();
    input.focus();
    setScrollY(300);
    btn.focus();
    fireEvent.focusOut(input);
    expect(scrollTo).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(150); });
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('does not reset when focus moves directly to another input', () => {
    const { input, other } = mount();
    input.focus();
    setScrollY(300);
    other.focus();
    fireEvent.focusOut(input);
    act(() => { jest.advanceTimersByTime(150); });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does nothing when window.scrollY is already 0', () => {
    const { input, btn } = mount();
    input.focus();
    btn.focus();
    fireEvent.focusOut(input);
    act(() => { jest.advanceTimersByTime(150); });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('resets on visualViewport growth (keyboard closing) but not on shrink', () => {
    const listeners: Record<string, () => void> = {};
    const vv: VV = {
      height: 400,
      addEventListener: jest.fn((e: string, cb: () => void) => { listeners[e] = cb; }),
      removeEventListener: jest.fn(),
    };
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
    mount();
    setScrollY(300);

    vv.height = 300; // shrink (keyboard opening)
    act(() => { listeners.resize(); jest.advanceTimersByTime(150); });
    expect(scrollTo).not.toHaveBeenCalled();

    vv.height = 700; // grow (keyboard closing)
    act(() => { listeners.resize(); jest.advanceTimersByTime(150); });
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  function mockVV(height: number) {
    const listeners: Record<string, () => void> = {};
    const vv: VV = {
      height,
      addEventListener: jest.fn((e: string, cb: () => void) => { listeners[e] = cb; }),
      removeEventListener: jest.fn(),
    };
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
    return { vv, listeners };
  }

  it('does not reset on partial viewport growth (below full height) while a field is focused', () => {
    const { vv, listeners } = mockVV(400);
    const { input } = mount();
    input.focus();
    setScrollY(300);
    vv.height = window.innerHeight - 50; // e.g. QuickType bar change, keyboard still open
    act(() => { listeners.resize(); jest.advanceTimersByTime(150); });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('resets on confirmed keyboard close (full height) even if the field stays focused, preserving main scroll', () => {
    const { vv, listeners } = mockVV(window.innerHeight);
    const main = document.createElement('main');
    document.body.appendChild(main);
    main.scrollTop = 250;
    const { input } = mount();
    input.focus();
    setScrollY(300);

    vv.height = 400; // keyboard opens
    act(() => { listeners.resize(); jest.advanceTimersByTime(150); });
    expect(scrollTo).not.toHaveBeenCalled();

    vv.height = window.innerHeight - 1; // restored (1px tolerance)
    act(() => { listeners.resize(); jest.advanceTimersByTime(150); });
    expect(document.activeElement).toBe(input);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(main.scrollTop).toBe(250);
  });

  it('removes listeners and pending timers on unmount', () => {
    const vv: VV = { height: 400, addEventListener: jest.fn(), removeEventListener: jest.fn() };
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    const { input, btn, unmount } = mount();
    input.focus();
    setScrollY(300);
    btn.focus();
    fireEvent.focusOut(input); // pending timer
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('focusout', expect.any(Function), true);
    expect(vv.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    act(() => { jest.advanceTimersByTime(150); });
    expect(scrollTo).not.toHaveBeenCalled();
    removeSpy.mockRestore();
  });

  it('works when visualViewport is undefined', () => {
    const { input, btn } = mount();
    input.focus();
    setScrollY(10);
    btn.focus();
    fireEvent.focusOut(input);
    act(() => { jest.advanceTimersByTime(150); });
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
