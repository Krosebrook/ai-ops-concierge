import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

/**
 * Error Boundary component to catch React errors
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
          <Card className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            {this.state.error && (
              <div className="mb-6 p-3 bg-slate-100 rounded-lg text-left">
                <p className="text-xs font-mono text-slate-700">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            <Button onClick={this.handleReset} className="w-full">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Reload Page
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}