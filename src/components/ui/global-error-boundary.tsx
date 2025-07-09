'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import useErrorStore from '@/stores/error-store';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const addError = useErrorStore.getState().addError;

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GlobalErrorBoundary caught an error:', error, errorInfo);
    addError(error, errorInfo);
    this.setState({ hasError: false }); // Reset state to continue rendering children
  }

  render() {
    return this.props.children;
  }
}

export default GlobalErrorBoundary;