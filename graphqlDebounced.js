import React, { Component } from "react";
import debounce from "lodash/debounce";
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

// Stolen from Apollo
shallowEqual(objA, objB) {
  if (!objA || !objB) return false;
  if (objA === objB) return true;

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  // Test for A's keys different from B.
  const hasOwn = Object.prototype.hasOwnProperty;
  for (let i = 0; i < keysA.length; i++) {
    if (!hasOwn.call(objB, keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
      return false;
    }
  }

  return true;
}

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
          const variablesHaveChanged = documentVariables.find(v => {
            return !shallowEqual(this.props[v], nextProps[v]);
          });
          if (variablesHaveChanged) {
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
