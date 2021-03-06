import * as React from 'react';
import { css } from 'emotion';
import * as distanceInWords from 'date-fns/distance_in_words_to_now';
import { Lozenge } from './Lozenge';
import { LozengeAppearance } from './types';
import { User } from './User';

let queueItemStyles = css({
  display: 'block',
  boxSizing: 'border-box',
  padding: '12px 12px 8px',
  position: 'relative',
  boxShadow: 'rgba(23, 43, 77, 0.24) 0px 0px 1px 0px',
  backgroundColor: 'white',
  borderRadius: '3px',
  transition: 'box-shadow 0.3s',
  color: 'inherit',

  '&:hover': {
    boxShadow: 'rgba(23, 43, 77, 0.32) 0px 4px 8px -2px, rgba(23, 43, 77, 0.25) 0px 0px 1px',
    color: 'inherit',
    textDecoration: 'none',
  },

  '& .queue-item__title': {
    fontSize: '16px',
    fontWeight: '500',
    lineHeight: '1.25',
    maxWidth: '100%',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    marginBottom: '3px',
  },

  '& .queue-item__status-line': {
    display: 'flex',
    flexGrow: 1,
    flexWrap: 'wrap',
    marginTop: 'auto',
    overflow: 'hidden',
    height: '28px',
  },

  '& .queue-item__status-item': {
    display: 'inline-flex',
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 'calc(100% - 16px)',
    height: '28px',

    '& + .queue-item__status-item': {
      marginLeft: '9px',
    },
  },

  '& .queue-item__status-item-title': {
    display: 'block',
    color: 'var(--n300-color)',
    fontSize: '12px',
    lineHeight: '1.33333',
    marginRight: '6px',
  },

  '& .queue-item__clickable': {
    userSelect: 'none',
    '&:hover': {
      cursor: 'pointer',
    },
  },
});

let queueItemJoinedStyles = css({
  paddingTop: '27px',
  position: 'relative',
  '&:before': {
    position: 'absolute',
    display: 'block',
    content: '""',
    width: '1px',
    height: '27px',
    background: 'var(--n20-color)',
    top: '0',
    left: '50%',
    marginLeft: '-1px',
  },
});

let icon = css({
  height: '11px',
  width: '11px',
  marginBottom: '-1px',
  paddingRight: '2px',
});

let duration = (start: number, end: number) => {
  let diffMs = end - start;
  let rawSeconds = diffMs / 1000;
  let minutes = Math.floor(rawSeconds / 60);
  let seconds = Math.floor(rawSeconds - minutes * 60);
  return `${minutes}m ${seconds}s`;
};

export type StatusItemProps = {
  title: string;
};

export const StatusItem: React.FunctionComponent<StatusItemProps> = props => (
  <div className="queue-item__status-item">
    <span className="queue-item__status-item-title">{props.title}</span>
    {props.children}
  </div>
);

const landStatusToAppearance: Record<IStatusUpdate['state'], LozengeAppearance> = {
  'will-queue-when-ready': 'new',
  'awaiting-merge': 'new',
  queued: 'new',
  running: 'inprogress',
  success: 'success',
  fail: 'removed',
  aborted: 'moved',
};

const landStatusToNiceString: Record<IStatusUpdate['state'], string> = {
  'will-queue-when-ready': 'Waiting to Land',
  'awaiting-merge': 'Awaiting Merge',
  queued: 'In Queue',
  running: 'Running',
  success: 'Succeeded',
  aborted: 'Aborted',
  fail: 'Failed',
};

const landStatusToPastTense: Record<IStatusUpdate['state'], string> = {
  'will-queue-when-ready': 'Told To Land When Ready',
  'awaiting-merge': 'Told to Merge',
  queued: 'Told To Land',
  running: 'Started',
  success: 'Succeeded',
  fail: 'Failed',
  aborted: 'Aborted',
};

const targetBranchToAppearance = (branch?: string) =>
  branch === 'master' ? 'moved' : branch === 'develop' ? 'new' : 'default';

const buildUrlFromId = (base: string, id: number) => `${base}/addon/pipelines/home#!/results/${id}`;

const prUrlFromId = (base: string, id: number) => `${base}/pull-requests/${id}`;

export type QueueItemProps = {
  status: IStatusUpdate;
  bitbucketBaseUrl: string;
  queue?: IStatusUpdate[];
};

type QueueItemState = {
  status: IStatusUpdate;
  landRequestInfo: {
    statuses: IStatusUpdate[];
  } | null;
};

export class QueueItem extends React.Component<QueueItemProps, QueueItemState> {
  state: QueueItemState = {
    status: this.props.status,
    landRequestInfo: null,
  };

  handleRemoveClick = () => {
    fetch(`/api/remove/${this.props.status.requestId}`, { method: 'POST' })
      .then(response => response.json())
      .then(json => {
        if (json.error) {
          console.error(json.error);
          window.alert(json.error);
        } else {
          location.reload();
        }
      });
  };

  handleCancelClick = () => {
    fetch(`/api/cancel/${this.props.status.requestId}`, { method: 'POST' })
      .then(response => response.json())
      .then(json => {
        if (json.error) {
          console.error(json.error);
          window.alert(json.error);
        } else {
          location.reload();
        }
      });
  };

  displayMoreInfo = () => {
    fetch(`/api/landrequest/${this.props.status.requestId}`, { method: 'GET' })
      .then(response => response.json())
      .then(landRequestInfo =>
        this.setState({
          status: landRequestInfo.statuses.find(
            (status: IStatusUpdate) => status.isLatest === true,
          ),
          landRequestInfo,
        }),
      );
  };

  renderMoreInfo = (status: IStatusUpdate, dependsOn: string[], bitbucketBaseUrl: string) => {
    if (this.state.landRequestInfo === null) return null;

    const buildId = status.request.buildId;
    const buildUrl = buildId ? buildUrlFromId(bitbucketBaseUrl, buildId) : '#';

    return (
      <React.Fragment>
        {buildId ? (
          <div className="queue-item__status-line" style={{ paddingLeft: '16px' }}>
            <StatusItem title="Pipelines link:">
              <a href={buildUrl}>#{buildId}</a>
            </StatusItem>
          </div>
        ) : null}
        <div className="queue-item__status-line" style={{ paddingLeft: '16px' }}>
          {this.state.landRequestInfo.statuses.map((status, index, statuses) => (
            <StatusItem
              title={
                index === 0
                  ? 'Status History:'
                  : `— ${duration(+new Date(statuses[index - 1].date), +new Date(status.date))} →`
              }
            >
              <Lozenge
                appearance={landStatusToAppearance[status.state]}
                title={status.reason || undefined}
              >
                {landStatusToNiceString[status.state]}
              </Lozenge>
            </StatusItem>
          ))}
        </div>
        {status.reason ? (
          <div className="queue-item__status-line" style={{ paddingLeft: '16px' }}>
            <StatusItem title="Reason:">{status.reason}</StatusItem>
          </div>
        ) : null}
        {['success', 'fail', 'aborted'].includes(status.state) && dependsOn.length > 0 ? (
          <div className="queue-item__status-line" style={{ paddingLeft: '16px' }}>
            <StatusItem title="Depended On:">{dependsOn.join(', ')}</StatusItem>
          </div>
        ) : null}
      </React.Fragment>
    );
  };

  render() {
    const { bitbucketBaseUrl, queue } = this.props;
    const { status } = this.state;
    const {
      request: { dependsOn, pullRequestId, pullRequest },
    } = status;

    const dependsOnPRs: string[] = [];
    if (dependsOn && queue) {
      dependsOn.split(',').forEach(depId => {
        const depItem = queue.find(item => item.requestId === depId);
        if (!depItem) {
          console.error(`Cannot find dependency PR with request id ${status.requestId}`);
          dependsOnPRs.push('??');
        } else {
          dependsOnPRs.push(`#${depItem.request.pullRequestId}`);
        }
      });
    }

    return (
      <div className={`${queueItemStyles} queue-item`}>
        <ak-grid layout="fluid">
          <ak-grid-column size={status.state === 'queued' || status.state === 'running' ? 11 : 12}>
            <div className="queue-item__title">
              <a href={prUrlFromId(bitbucketBaseUrl, pullRequestId)}>[PR #{pullRequestId}]</a>{' '}
              {pullRequest.title}
            </div>
            <div className="queue-item__status-line">
              <StatusItem title="Status:">
                <Lozenge appearance={status ? landStatusToAppearance[status.state] : 'new'}>
                  {landStatusToNiceString[status.state]}
                </Lozenge>
              </StatusItem>

              <StatusItem title="Author:">
                <Lozenge>
                  <User aaid={pullRequest.authorAaid}>
                    {user => {
                      return user.displayName;
                    }}
                  </User>
                </Lozenge>
              </StatusItem>

              {pullRequest.targetBranch ? (
                <StatusItem title="Target Branch:">
                  <Lozenge
                    appearance={targetBranchToAppearance(pullRequest.targetBranch)}
                    title={pullRequest.targetBranch}
                  >
                    {pullRequest.targetBranch}
                  </Lozenge>
                </StatusItem>
              ) : null}

              <StatusItem title={`${landStatusToPastTense[status.state]}:`}>
                {distanceInWords(status.date, { addSuffix: true })}
              </StatusItem>
            </div>

            {(status.state === 'queued' || status.state === 'running') &&
            dependsOnPRs.length > 0 ? (
              <div className="queue-item__status-line">
                <StatusItem title="Build depends on:">{dependsOnPRs.join(', ')}</StatusItem>
              </div>
            ) : null}
          </ak-grid-column>

          {['queued', 'running'].includes(status.state) ? (
            <ak-grid-column size={1} style={{ alignSelf: 'center' }}>
              <button
                className="ak-button ak-button__appearance-default"
                style={{ float: 'right' }}
                onClick={() =>
                  status.state === 'queued' ? this.handleRemoveClick() : this.handleCancelClick()
                }
              >
                {status.state === 'queued' ? 'Remove' : 'Cancel'}
              </button>
            </ak-grid-column>
          ) : null}
        </ak-grid>

        <div className="queue-item__status-line" style={{ paddingLeft: '16px' }}>
          <div
            className="queue-item__clickable"
            style={{ width: '95px' }}
            onClick={() =>
              this.state.landRequestInfo
                ? this.setState({ landRequestInfo: null })
                : this.displayMoreInfo()
            }
          >
            <svg focusable="false" className={icon}>
              <use xlinkHref={`#ak-icon-${this.state.landRequestInfo ? 'cross' : 'add'}`} />
            </svg>
            <StatusItem title={this.state.landRequestInfo ? 'Show less' : 'Show more...'} />
          </div>
        </div>
        {this.renderMoreInfo(status, dependsOnPRs, bitbucketBaseUrl)}
      </div>
    );
  }
}

export const QueueItemJoined: React.FunctionComponent<QueueItemProps> = props => (
  <div className={`${queueItemJoinedStyles} queue-item-joined`}>
    <QueueItem {...props} />
  </div>
);
