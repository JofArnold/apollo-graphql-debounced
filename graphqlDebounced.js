import React, { Component } from "react";
import debounce from "lodash/debounce";
import deepEqual from "lodash/isEqual";
import { withApollo } from "react-apollo";

// Work in progress faking of Apollo's `graphql` HOC. Has essentially the same API.
// Todo
// - [] handle query errors
// - [] flow type checking
// - [] add tests
// - [] release
// - [] everything...
//

// ----------------------------------------
// EXAMPLE USAGE

// const SEARCH = gql`
//   query Search($counter: Int!) {
//     getValueForCount(count: $counter) {
//       someFetchedValueBasedOn$counter
//     }
//   }
// `;
//
// const GetsFedResultOfQuery = ({data: {someFetchedValueBasedOn$counter}}) =>
//   <div>Counting! {someFetchedValueBasedOn$counter}</div>

// const CausesGraphQLFetchWhenPropsChange = graphql(SEARCH)(GetsFedResultOfQuery);
//
// class MyComponent extends Component {
//   constructor(props) {
//     super(props);
//     this.state = {counter: 1};
//  }
//
//   render() {
//      <div>
//        <Button
//          onClick={() => this.setState(counter: this.state.counter } + 1}
//        >
//          Click me
//        </Button>
//        <CausesGraphQLFetchWhenPropsChange counter={this.state.counter} />
//      </div>
//   }

// Parse AST to determine what variables are being sent through
function getVariableNames(query) {
  const document = query;
  if (!document) return null;
  if (document.kind !== "Document") return null;
  const definitions = document.definitions;
  if (!definitions) return null;
  const operationDefinitions = definitions.filter(
    ({ kind }) => kind === "OperationDefinition"
  );
  if (operationDefinitions.length !== 1)
    throw new Error("Expected exactly one OperationDefinition");
  const variableDefinitions = operationDefinitions[0].variableDefinitions;
  if (!variableDefinitions) return [];
  return variableDefinitions.map(d => d.variable.name);
}

function graphqlDebounced(query, delay = 1000) {
  const documentVariables = getVariableNames(query).map(v => v.value);
  return function GraphqlDebouncedFactory(WrappedComponent) {
    return withApollo(
      class GraphqlDebouncedHOC extends Component {
        constructor(props) {
          super(props);
          this.debouncedFetch = debounce(this._fetch, delay);
          this.state = { response: {} };
        }

        async _fetch() {
          const props = this.props;
          const variables = documentVariables.reduce((running, v) => {
            return { ...running, [v]: props[v] };
          }, {});
          // TODO: handle errors in a graphql way
          const results = await this.props.client.query({
            query,
            variables,
          });
          const { data, ...rest } = results;
          const response = { ...data, ...rest };
          this.setState({ response });
        }

        componentWillUpdate(nextProps, nextState) {
          // TODO: Do deep equal only on the variables
          if (!deepEqual(this.props, nextProps)) {
            this.setState({
              ...nextState,
              response: { ...nextState.response, loading: true },
            });
            this.debouncedFetch();
          }
        }

        render() {
          return (
            <WrappedComponent {...this.props} data={this.state.response} />
          );
        }
      }
    );
  };
}

export default graphqlDebounced;
