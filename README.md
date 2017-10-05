# apollo-graphql-debounced
A debounced version of Apollo's `graphql` HOC. EXTREMELY WORK IN PROGRESS!

### Example usage

Written freehand. Untested. But should give you the gist.

```
const SEARCH = gql`
  query Search($counter: Int!) {
    getValueForCount(count: $counter) {
      someFetchedValueBasedOn$counter
    }
  }
`;

const GetsFedResultOfQuery = ({data: {someFetchedValueBasedOn$counter}}) =>
  <div>Counting! {someFetchedValueBasedOn$counter}</div>

const CausesGraphQLFetchWhenPropsChange = graphql(SEARCH)(GetsFedResultOfQuery);

class MyComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {counter: 1};
 }

  render() {
     <div>
       <Button
         onClick={() => this.setState(counter: this.state.counter } + 1}
       >
         Click me
       </Button>
       <CausesGraphQLFetchWhenPropsChange counter={this.state.counter} />
     </div>
  }
}
```
