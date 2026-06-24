import {
  getTimelineCoverFieldInterfaces,
  registerTimelineCoverFieldInterfaces,
  resetTimelineCoverFieldInterfacesForTest,
  resolveTimelineFieldInterfaces,
} from '../gallery-cover-field-interfaces';

describe('timeline cover field interfaces', () => {
  beforeEach(() => {
    resetTimelineCoverFieldInterfacesForTest();
  });

  it('should expose attachment by default', () => {
    expect(getTimelineCoverFieldInterfaces()).toEqual(['attachment']);
  });

  it('should register additional interfaces without removing defaults', () => {
    registerTimelineCoverFieldInterfaces(['multipleEntryModesAttachment', '', 'attachment']);

    expect(getTimelineCoverFieldInterfaces()).toEqual(['attachment', 'multipleEntryModesAttachment']);
  });

  it('should keep newly registered interfaces available after repeated reads', () => {
    registerTimelineCoverFieldInterfaces(['multipleEntryModesAttachment']);

    expect(getTimelineCoverFieldInterfaces()).toEqual(['attachment', 'multipleEntryModesAttachment']);
    expect(getTimelineCoverFieldInterfaces()).toEqual(['attachment', 'multipleEntryModesAttachment']);
  });

});
