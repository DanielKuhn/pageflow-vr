(function() {
  class VrView extends React.Component {
    constructor(props, context) {
      super(props, context);

      this._lastCurrentTime = -1;
      this._lastSource = null;

      this.bindPlayer = iframe => {
        if (this.player) {
          this.player.dispose();
        }

        this.player = pageflow.vr.Player.create(iframe, {
          context: this.context.mediaContext
        });

        if (this.player) {
          this.player.on({
            loading: () => {
              this._lastCurrentTime = 0;

              if (this.props.onLoading) {
                this.props.onLoading();
              }
            },

            ready: () => {
              if (this.props.onReady) {
                this.props.onReady();
              }
            },

            canplay: () => {
              if (this.props.isPlaying) {
                this.player.play();
              }
            },

            timeupdate: (event) => {
              if (this._lastCurrentTime >= 0) {
                this._lastCurrentTime = event.currentTime;
              }
            }
          });
        }
      };
    }

    componentWillReceiveProps(nextProps) {
      if (this.props.videoId != nextProps.videoId) {
        this._lastCurrentTime = -1;
      }

      if (!this.player) {
        return;
      }

      if (nextProps.isPlaying) {
        // Calling play while already playing is no-op. Since play
        // might fail when not inside user gesture, always try to play
        // when prop is set.
        this.player.play();
      }
      else if (this.props.isPlaying && !nextProps.isPlaying) {
        this.player.fadeOutAndPause(200);
      }

      if (!this.props.isCardboardModeRequested && nextProps.isCardboardModeRequested) {
        this.player.enterVRMode();

        // Trigger reset of prop right away. This should listen for events emitted by the iframe instead.
        if (nextProps.onExitCardboardMode) {
          setTimeout(() => {
            nextProps.onExitCardboardMode();
          }, 100);
        }
      }
    }

    render() {
      return (
        <div className="pageflow_vr-vr_view">
          {this.renderIframeIfPrepared()}
        </div>
      );
    }

    renderIframeIfPrepared() {
      if (this.props.pageIsPrepared && this.source()) {
        return this.renderIframe();
      }
    }

    renderIframe() {
      return (
        <iframe ref={this.bindPlayer}
                className="pageflow_vr-vr_view-frame"
                allowFullScreen
                frameBorder="0"
                src={this.sourceWithUpdatingStartTime()}>
        </iframe>
      );
    }

    sourceWithUpdatingStartTime() {
      // Only update the start time if the iframe src would change anyway
      // to prevent reloading the iframe by only changing the start time.
      if (this.source() != this._lastSource) {
        this._startTime = this._lastCurrentTime >= 0 ? this._lastCurrentTime : 0;
      }

      this._lastSource = this.source();
      return this._lastSource;
    }

    source() {
      const props = this.props;

      if (!props.videoFile || !props.videoFile.urls[props.quality]) {
        return null;
      }

      return url({
        id: props.id,
        video: props.videoFile.urls[props.quality],
        preview: props.posterFile ? props.posterFile.urls.ultra : props.videoFile.urls.poster_ultra,
        is_stereo: props.videoFile.projection == 'equirectangular_stereo' ? 'true' : 'false',
        start_yaw: props.startYaw,
        start_time: this._startTime,
        no_autoplay: true
      });
    }
  }

  VrView.contextTypes = {
    mediaContext: React.PropTypes.object
  };

  function url(params) {
    const paramsString = Object.keys(params).map((key) =>
      `${key}=${params[key]}`
    ).join('&');

    return `/pageflow_vr/vrview.html?${paramsString}`;
  }

  const {connectInPage, combine} = pageflow.react;
  const {pageIsPrepared, file, prop} = pageflow.react.selectors;

  pageflow.vr.VrView = connectInPage(combine({
    pageIsPrepared: pageIsPrepared(),
    videoFile: file('videoFiles', {
      id: prop('videoId')
    }),
    posterFile: file('imageFiles', {
      id: prop('posterId')
    })
  }))(VrView);
}());
