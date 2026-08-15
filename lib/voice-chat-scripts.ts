/**
 * Steps for the modal voice chat. `key` must match what each screen’s
 * `handleChatComplete` reads from the payload (see new experiment / new cell line screens).
 */
export type VoiceChatStep = {
  readonly key: string;
  readonly question: string;
};

/** New experiment form — voice fills fields the parent maps from these keys. */
export const NEW_EXPERIMENT_VOICE_STEPS: readonly VoiceChatStep[] = [
  {
    key: 'experimentName',
    question: 'What should we call this experiment? Say a short descriptive name.',
  },
  {
    key: 'description',
    question: 'What would you like in the description? Summarize the goal or design in a sentence or two.',
  },
  {
    key: 'status',
    question: 'Is this experiment planned, in progress, or completed?',
  },
  {
    key: 'startdate',
    question: 'What start date should we use? Say it in any clear form, for example May twelfth twenty twenty six, or use YYYY-MM-DD.',
  },
];

/**
 * New cell line form — keys align with `handleChatComplete` on the new cell line screen
 * (`cellType` is the cell line name field for historical consistency with that handler).
 */
export const NEW_CELL_LINE_VOICE_STEPS: readonly VoiceChatStep[] = [
  {
    key: 'cellType',
    question: 'What is the name of this cell line? For example HeLa or HEK293T.',
  },
  {
    key: 'organism',
    question: 'Which organism is it from? For example Human or Mouse.',
  },
  {
    key: 'tissue',
    question: 'What tissue type or origin should we record, if any?',
  },
  {
    key: 'morphology',
    question: 'How does it grow — for example adherent, suspension, or mixed?',
  },
  {
    key: 'doublingTime',
    question: 'What is the typical doubling time in hours? Say a number, or say unknown if you are not sure.',
  },
  {
    key: 'notes',
    question: 'Any other notes or important details for this cell line?',
  },
];
